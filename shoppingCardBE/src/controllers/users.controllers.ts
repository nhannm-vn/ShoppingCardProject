import { Request, Response, NextFunction } from 'express'
import {
  ChangePasswordReqBody,
  ForgotPasswordReqBody,
  GetProfileReqParams,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  UpdateMeReqBody,
  VerifyEmailToken,
  VerifyForgotPasswordTokenReqBody
} from '~/models/requests/users.request'
import userServices from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'

//_Nghĩa là trong table users có rất nhiều controller

//_controller là nơi xử lí logic và dữ liệu. Dữ liệu đi được tới đây thì đã clear
//  controller là handler chuyên xử lí dữ liệu vào đúng các server, xử lí trích xuất dữ liệu
//  ==> bản chất controller không đc nch với db, chỉ có server mới nói chuyện với db
//  mình chỉ là người đưa dữ liệu cho database

//**Lưu ý: controller chỉ kiểm tra if-else for đồ thôi chứ k có kiểm tra xem dữ liệu có đúng kiểu hay đủ đầy nữa k
//sau đó sẽ có cái xe trung chuyển tên services, sau đó cái xe dó mới lên databse và mang dữ liệu đưa về cho controller và controller đưa cho người dùng

//_làm controller cho register, và sẽ nhờ chiếc xe service đem dữ liệu từ controller đi qua database lưu và đem ngược về
//sau đó bào cho người dùng
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  //LƯU Ý: thí dụ quên đi thì lúc req.body bên trong k có gì hết
  //vì bản chất con body nó được định nghĩa là any
  //==> có nhu đầu định nghĩa để biết bên trong nó có gì
  //chứ nếu mà k định nghĩa thì mình sẽ không biết chắc được bên trong có gì và . không có gì
  const { email } = req.body
  //nhờ chiếc xe services truy cập tới và thêm dữ liệu vào database dùm mình
  //_Đã đụng tới database thì sẽ có trường hợp rớt mạng nên cần try-catch

  //_Kiểm tra nếu mà email đã trùng trên server rồi thì báo lỗi,
  //nếu chưa có thì đi xuống dưới tiếp
  const isDup = await userServices.checkEmailExist(email)
  if (isDup) {
    //Bây giờ khi có lỗi thì mình sẽ đúc ra theo ErrorWithStatus vì thật ra nó cũng chỉ là cái lỗi bthg
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY //422
    })
  }

  const result = await userServices.register(req.body)
  //_sau khi thêm thành công thì báo tín hiệu, đồng thời trả result ra cho người dùng
  //_tạo thành công là 201
  res.status(HTTP_STATUS.CREATED).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    //_khi mà tạo account thành công thì nó sẽ đưa cho mình 2 cái mã nằm bên trong result
    result
  })
}

//_req ở trước hay sau middleware đều là 1
export const loginController = async (
  req: Request<ParamsDictionary, any, LoginReqBody>,
  res: Response,
  next: NextFunction
) => {
  // throw new Error('lỗi test thử message')
  //==> new lỗi thường thì sẽ k nhìn thấy được
  //_Chạy hàm kiểm tra xem có trong db không
  const result = await userServices.login(req.body)
  //_Nếu mà login thất bại thì throw đã bắn lỗi xuống catch và next đã đưa qua tầng xử lí lỗi rồi
  //vì mình có kiến trúc wrapAsync nên mình k cần lo throw bể

  //_Nếu mà có có lỗi thì nó đã xử lí luôn r. Còn nếu k có gì tới đây thì báo login thành công
  //đồng thời bắn sắc lệnh ra cho ngta sử dụng
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>,
  res: Response,
  next: NextFunction
) => {
  //_Nó muốn logout thì đưa cho mình 2 cái mã. Và mình đã kiểm tra 2 cái mã đó là đúng do mình ký ra cho nó rồi
  //_Nhưng còn đòn hiểm ác là nó gửi ac của nó mà rf của mình. Thì cùng là mình ký nhưng user_id ở trong khác nhau. Nên cần kt
  const { user_id: user_id_at } = req.decode_authorization as TokenPayload
  const { user_id: user_id_rf } = req.decode_refresh_token as TokenPayload
  const { refresh_token } = req.body

  //_Nếu không giống nhau thì báo lỗi đb luôn
  if (user_id_at != user_id_rf) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID,
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }

  //_nếu cả 2 đều có id chuẩn rồi thì mình check thử xem là nó có quyền được sử dụng dịch vụ hay không
  //nếu có thì mới cho sử dụng dịch vụ logout
  await userServices.checkRefreshToken({
    user_id: user_id_at,
    refresh_token
  })

  // khi nào có mã đó trong database thì mình tiến hành logout nghĩa là xóa rf khỏi hệ thống
  await userServices.logout(refresh_token)

  //_Nếu xóa thành công thì sẽ xuống dưới đây. Mà nếu tới đây thì thông báo thành công
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGOUT_SUCCESS
  })
}

export const verifyEmailTokenController = async (
  req: Request<ParamsDictionary, any, any, VerifyEmailToken>,
  res: Response,
  next: NextFunction
) => {
  //_Đầu tiên kiểm tra xem acount đó có tồn tại trong hệ thống không. Bằng user_id và email_verify_token
  const { user_id } = req.decode_email_verify_token as TokenPayload
  const { email_verify_token } = req.query
  const user = await userServices.checkEmailVerifyToken({ user_id, email_verify_token })

  //_Nếu mà đã tồn tại account rồi thì mình sẽ kiểm tra tiếp xem thử là verify đang ở trạng thái nào
  //nếu như đã verify rồi thì k làm gì hết chỉ báo thôi. Nếu mà banned thì cũng vào. Còn unverify thì mới tiến hành verify
  if (user.verify == UserVerifyStatus.Verified) {
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_VERIFIED
    })
  } else if (user.verify == UserVerifyStatus.Banned) {
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_BANNED
    })
  } else {
    //_nếu chưa verify thì tiến hành verify và cung cấp access và refresh để xài dịch vụ
    const result = await userServices.verifyEmail(user_id)
    //nếu thành công thì thông báo
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.VERIFY_EMAIL_SUCCESS,
      result
    })
  }
}

export const resendEmailVerifyController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  //_lấy user_id và kiểm tra thử xem account có tồn tại không
  const { user_id } = req.decode_authorization as TokenPayload
  const user = await userServices.findUserById(user_id)
  //_Nếu mà bị unverify thì mới cần resend email. Chứ banned hay verify rồi thì resend nữa làm gì
  if (user.verify == UserVerifyStatus.Verified) {
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_VERIFIED
    })
  } else if (user.verify == UserVerifyStatus.Banned) {
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_BANNED
    })
  } else {
    //_Nếu mà chưa verify thì mình sẽ tiến hành gửi lại mã
    await userServices.resendEmailVerify(user_id)
    //_Sau đó thì thông báo gửi thành công là xong
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.RESEND_EMAIL_VERIFY_TOKEN_SUCCESS
    })
  }
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //_Đầu tiên kiểm tra email người dùng cung cấp có tồn tại trên hệ thống hay không
  const { email } = req.body
  const hasEmail = await userServices.checkEmailExist(email)
  if (!hasEmail) {
    //thông báo k tìm thấy luôn
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  } else {
    //_viết hàm lưu token forgot_password_token và đường link dẫn đến giao diện lấy lại mật khẩu
    await userServices.forgotPassword(email)
    //_thông báo thành công
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD
    })
  }
}

export const verifyForgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  //_Lấy user_id và forgot_password_token để tìm xem user có tồn tại không
  //**Lưu ý: mình không cần kiểm tra trạng thái verify(business rule) vì mình banned hay unverify mình vẫn cho lấy lại mật khẩu
  const { user_id } = req.decode_forgot_password_token as TokenPayload
  const { forgot_password_token } = req.body
  const user = await userServices.checkForgotPasswordToken({
    user_id, //
    forgot_password_token
  })

  //_Nếu mà tìm thấy thì thông báo cho fe biết là mã chuẩn đét rồi đấy
  //và lập tức fe sẽ mở ra giao diện nhập mk mới cho user
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //_Lấy user_id và forgot_password_token để tìm xem user có tồn tại không
  //**Lưu ý: mình không cần kiểm tra trạng thái verify(business rule) vì mình banned hay unverify mình vẫn cho lấy lại mật khẩu
  const { user_id } = req.decode_forgot_password_token as TokenPayload
  const { forgot_password_token, password } = req.body
  const user = await userServices.checkForgotPasswordToken({
    user_id, //
    forgot_password_token
  })

  //_Sau khi kiểm tra và biết user tồn tại thì reset password
  await userServices.resetPassword({
    user_id, //giúp tìm tới user
    password
  })

  //_Sau khi update thi thong bao
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

export const getMeController = async (req: Request<ParamsDictionary, any, any>, res: Response, next: NextFunction) => {
  //_Lấy user_id
  const { user_id } = req.decode_authorization as TokenPayload
  //_Dựa vào user_id tìm kiếm và trả thông tin về
  const userInfor = await userServices.getMe(user_id)

  //_Thong bao va dua thong tin
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_PROFILE_SUCCESS,
    userInfor
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  //_Người dùng truyền lên access_token và từ đó mình biết được họ là ai
  const { user_id } = req.decode_authorization as TokenPayload
  //_Nội dung họ muốn update thì gọi chung là payload
  const payload = req.body as UpdateMeReqBody
  //_Muốn update thì phải kiểm tra xem có user đó trên db không và có verify email chưa. Verify rồi thì mới update
  const isVerified = await userServices.checkEmailVerified(user_id)
  //_Nếu chưa verify thì báo và dừng đây luôn. Còn verify rồi thì đi tiếp
  if (!isVerified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: USERS_MESSAGES.USER_NOT_VERIFIED
    })
  }

  //_Sau khi check rồi thì tiến hành update profile
  //truyền vào user_id để tiện việc xài combo tìm và update
  const userInfor = await userServices.updateMe({ user_id, payload })

  //thông báo cho người dùng
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    userInfor
  })
}

//_luyện tập trước

export const getProfileController = async (
  req: Request<GetProfileReqParams, any, any>,
  res: Response,
  next: NextFunction
) => {
  //_Vì mình đã định nghĩa nên có thể lấy được
  const { username } = req.params
  const result = await userServices.getProfile(username)
  res.json({
    message: USERS_MESSAGES.GET_PROFILE_SUCCESS, //message.ts thêm  GET_PROFILE_SUCCESS: 'Get profile success',
    result
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //_Kiểm tra xem từ user_id và old_password thì mình có tìm được user nào không
  //nếu có thì mình sẽ tiến hành thay đổi password luôn, còn không có thì báo lỗi
  const { user_id } = req.decode_authorization as TokenPayload
  //_lấy password và old_password ra
  const { password, old_password } = req.body
  //_mình sẽ viết hàm để có thể tìm và update password mới luôn
  await userServices.changePassword({
    user_id, //
    old_password,
    password
  })
  //_Nếu được tới đây thì có nghĩa là thay đổi password thành công thì chỉ cần thông báo là xong
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  //_Đầu tiên cần lấy user_id và refreshToken phục vụ cho check xem user đó có tồn tại không
  //_TokenPayload là sẽ chứa những thông tin khi mà mình đecode ra
  //lúc này mình sẽ lấy thêm exp ngày hết hạn để khi refresh token thì
  //sẽ tạo ra cái mã mới có exp trùng mã cũ. Mà exp nằm ngay bên trong decode
  //_chính gì vậy mà mình sẽ móc giá trị được lưu trong decode khi verify và trong đó có iat và exp
  const { user_id, exp } = req.decode_refresh_token as TokenPayload
  const { refresh_token } = req.body
  //_Kiểm tra xem user có tồn tại hay không. Nếu không tồn tại thì báo lỗi luôn rồi
  await userServices.checkRefreshToken({ user_id, refresh_token })
  //_Nếu ổn và tồn tại thì viết hàm tạo refresh_token và access_token
  //_Mình cần truyền vào user_id để ký ra token và refresh_token để tìm và xóa token cũ
  const result = await userServices.refreshToken({ user_id, refresh_token, exp })
  //_Thong bao va dua token cho ho su dung luon
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result
  })
}
