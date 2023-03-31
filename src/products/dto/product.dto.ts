import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum ProductType {
  KINDLE = 'kindle',
  PAPERBACK = 'paperBack',
}
export class InnerVariantDTO {
  @IsDefined()
  @IsNotEmpty()
  @IsEnum(ProductType)
  type: ProductType;

  @IsDefined()
  @IsNotEmpty()
  @IsNumber()
  @Max(10000)
  @Min(0)
  quantity: number;

  @IsDefined()
  @IsNotEmpty()
  @IsNumber()
  @Max(10000)
  @Min(0)
  maxOrder: number;

  @IsDefined()
  @IsNotEmpty()
  @IsNumber()
  @Max(1000000000)
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Max(100)
  @Min(0)
  discount: number;
}

export class InnerSpecsDTO {
  @IsNotEmpty()
  k: string | number;

  @IsNotEmpty()
  v: string | number;
}

export class CreateProductDto {
  @IsNotEmpty()
  @Length(1, 150)
  name: string;

  @ValidateNested({ each: true })
  @Type(() => InnerVariantDTO)
  variants: InnerVariantDTO[];

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsArray()
  productPictures: Array<string>;

  @ValidateNested({ each: true })
  @Type(() => InnerSpecsDTO)
  specs: InnerSpecsDTO[];
}

export class QueryGetAll {
  @IsOptional()
  name: string;

  @IsOptional()
  sellerId: string;

  @IsOptional()
  page: number;

  @IsOptional()
  limit: number;

  @IsOptional()
  categoryId: string;
}
