import { IsNotEmpty, IsOptional, Length } from 'class-validator';
export class CreateCategoryDto {
  @IsNotEmpty()
  @Length(1, 50)
  name: string;

  @IsOptional()
  categoryImage: string;
}
