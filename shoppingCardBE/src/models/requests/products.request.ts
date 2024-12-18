import { ObjectId } from 'mongodb'
import { Media } from '../Other'
import { ParamsDictionary } from 'express-serve-static-core'

export interface CreateProductReqBody {
  name: string
  quantity: number
  price: number
  description: string
  brand_id: ObjectId
  origin: string //xuất xứ
  volume: number // dung tích
  weight: number // khối lượng
  width: number
  height: number
  category_id: string //mã chủng loại
  ship_category_id: string //chủng loại để đặt đơn bên ghn
  medias: Media[] //medias là cái mảng lưu nhưng thằng có type là Media
}

export interface GetProductByIdReqParams extends ParamsDictionary {
  id: string
}

export interface GetAllProductsReqQuery {
  page: string
  limit: string
}
