// import các interface build-in(tạo sẵn) của express để mô tả
import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { validate } from '~/utils/validation'

//_middleware thực chất cũng chỉ là function
//  trong này liên quan đến các file lọc dữ liệu liên quan đến users
//  middleware là handler giúp kiểm tra dữ liệu có đầy đủ và đúng định dạng khi
//  người dùng truyền lên hay là không. Dữ liệu qua các middleware để lọc và khi đến controller thì phải clear

//_giờ ta sẽ phát triển chức năng login
//  khi mà người dùng gửi lên email và password sẽ kiểm tra thử xem là dữ liệu có đầy đủ hay không
//  **middleware không được kiểm tra là đúng mk hay không?
//  ==> Giải thích: vì tầng này chỉ kiểm tra đủ đầy, rồi sau đó controller mới cầm dữ liệu
//  và phân phát đúng vào vị trí của database phù hợp
//  Tầng này k đc đụng chạm vào db gì hết vì sẽ đụng vào quy tắc 3 lớp
//  middleware chỉ xử lý xem đủ dữ liệu hay không thôi

// _hàm middleware lưới lọc dữ liệu của login
// nếu là mdw thì bản chất cũng chỉ là cái hàm
export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
  //em muốn gửi cho anh email hoặc pw em phải gửi cho anh vào body
  //lúc nhận được req thì dữ liệu nằm ở trong req.body và trong đó sẽ có email, pw
  //muốn req. ra được body thì phải định dạng cho nó ==> địng dạng bằng các interface build-in có sẵn của express

  //_Đầu tiên mình biết chắc chắn ở trong req gửi lên và trong body có luôn email, password
  const { email, password } = req.body

  //_middleware này sẽ kiểm tra xem nếu dữ liệu mà gửi lên thiếu thì sẽ chửi
  if (!email || !password) {
    res.status(400).json({
      message: 'Missing email or password'
    })
  } else {
    //*Bất đắt dĩ thôi chứ đúng thì phải return next(), nhưng do mình chưa cấu hình type.d.ts
    //nếu mà để next ngoài thì sẽ báo đỏ lè

    //nếu chuẩn thì cho đi qua middleware tiếp theo
    // next là đi về controller luôn, nghĩa là dữ liệu đủ và đầy
    next()
  }
}

//_Bây giờ mình sẽ sử dụng công nghệ express-validator để làm lưới lọc middleware chắn
//các dữ liệu không valid
//_Tuy nhiên mình sẽ sử dụng checkSchema RunnableValidationChain(New) thay cho cách viết ValidationChain(old)
export const registerValidator = validate(
  checkSchema({
    //_Kiểm tra name
    name: {
      //_Không được bỏ trống
      notEmpty: {
        errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED
      },
      //_Phải là string
      isString: {
        errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING
      },
      //_Bỏ những khoảng thừa
      trim: true,
      //_Giới hạn độ dài
      isLength: {
        options: {
          min: 1,
          max: 100
        },
        //_Nếu không theo yêu cầu thì chửi
        errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
      }
    },
    //_Kiểm tra email
    email: {
      notEmpty: {
        errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
      },
      isString: {
        errorMessage: USERS_MESSAGES.EMAIL_MUST_BE_A_STRING
      },
      trim: true,
      //_ràng buộc kt email để nó tự chửi sẽ hay hơn
      isEmail: {
        errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
      }
    },
    //_Kiểm tra password:
    password: {
      notEmpty: {
        errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
      },
      isString: {
        errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
      },
      //_Do dai rang buoc
      isLength: {
        options: {
          min: 8,
          max: 50
        },
        //_Neu khong theo thi chui
        errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
      },
      //_Kiem tra strong password, nó còn có thể cho biết và đánh giá password như thế nào là mạnh
      isStrongPassword: {
        options: {
          minLowercase: 1,
          minUppercase: 1,
          minSymbols: 1,
          minNumbers: 1,
          minLength: 8
          // returnScore
        },
        //_Neu khong dat thi chui
        errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
      }
    },
    //_xac nhan lai password
    confirm_password: {
      notEmpty: {
        errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
      },
      isString: {
        errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
      },
      //_Do dai rang buoc
      isLength: {
        options: {
          min: 8,
          max: 50
        },
        //_Neu khong theo thi chui
        errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
      },
      //_Kiem tra strong confirm_password, nó còn có thể cho biết và đánh giá confirm_password như thế nào là mạnh
      isStrongPassword: {
        options: {
          minLowercase: 1,
          minUppercase: 1,
          minSymbols: 1,
          minNumbers: 1,
          minLength: 8
          // returnScore
        },
        //_Neu khong dat thi chui
        errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG
      },
      //_Đối với confirm_password thì mình cần kiểm tra thêm có giống password hay chưa
      //nhưng mình không có hàm đó thì mình phải tự viết bằng cách sử dụng custom
      //_Sử dụng express-validator sẽ giúp mình giảm thiểu việc phải sử dụng if-else. Tuy nhiên đối với những hàm
      //quá cá nhân thì cũng phải sử dụng if-else
      custom: {
        //_Đây sẽ là hàm kiểm tra xem password và confirm_password có giống nhau hay là không
        //value: confirm_password và password nằm trong body và nằm trong req, nhưng mình truyền {req} để khi . nó sẽ  hiểu là object và dễ dàng dùng
        options: (value, { req }) => {
          //***Kiểm tra nếu mà chúng không giống nhau thì sẽ sẽ tạo ra lỗi và sẽ ném ra
          //sau đó lỗi sẽ đc lưu trong cuốn nhật kí của checkSchema
          if (value !== req.body.password) {
            throw new ErrorWithStatus({
              status: HTTP_STATUS.UNAUTHORIZED, //401
              message: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD
            })
          } else {
            return true
            //nếu mà giống nhau thì sẽ trả ra true, nghĩa là k báo lỗi gì hết
          }
        }
      }
    },
    date_of_birth: {
      //_Đối với ngày thì phải kiểm tra xem chuẩn string dạng ISO8601 hay không
      //**Không cần check có bỏ trống hay không. Vì nếu bỏ trống thì schema mình sẽ tự động
      //lấy ngày hiện tại luôn
      isISO8601: {
        options: {
          strict: true,
          strictSeparator: true
        },
        errorMessage: USERS_MESSAGES.DATE_OF_BIRTH_BE_ISO8601
      }
    }
  })
)

//_Mặc định những cái điều kiện này nó sẽ tự chửi
//tuy nhiên nếu mình muốn theo ý mình thì custom theo errorMessage
