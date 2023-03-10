import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
export class CreateProductDto {
  @IsNotEmpty()
  @Length(1, 150)
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Max(10000)
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Max(10000)
  @Min(0)
  maxOrder: number;

  @IsNotEmpty()
  @IsNumber()
  @Max(1000000000)
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Max(100)
  @Min(0)
  discountPercent: number;

  @IsNotEmpty()
  @IsString()
  @Length(1, 250)
  summary: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsArray()
  productPictures: Array<string>;

  @IsOptional()
  specs: Array<any>;
}
