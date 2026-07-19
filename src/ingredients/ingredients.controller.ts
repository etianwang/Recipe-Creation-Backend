import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateIngredientDto,
  SearchIngredientsDto,
  UpdateIngredientDto,
} from './dto/ingredient.dto';
import { LookupSubstitutesDto } from './dto/lookup-substitutes.dto';
import { IngredientsService } from './ingredients.service';
import { SubstitutesService } from './substitutes.service';

@Controller('ingredients')
export class IngredientsController {
  constructor(
    private readonly ingredientsService: IngredientsService,
    private readonly substitutesService: SubstitutesService,
  ) {}

  @Get()
  async search(@Query() query: SearchIngredientsDto) {
    const data = await this.ingredientsService.search(query.q, query.category);
    return { code: 0, message: 'ok', data };
  }

  @Post('substitutes')
  @HttpCode(200)
  async lookupSubstitutes(@Body() dto: LookupSubstitutesDto) {
    const data = await this.substitutesService.listByIngredientName(
      dto.ingredient,
    );
    return { code: 0, message: 'ok', data };
  }

  @Get(':id/substitutes')
  async listSubstitutes(@Param('id') id: string) {
    const data = await this.substitutesService.listByIngredientId(id);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.ingredientsService.findById(id);
    return { code: 0, message: 'ok', data };
  }

  @Post()
  async create(@Body() dto: CreateIngredientDto) {
    const data = await this.ingredientsService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    const data = await this.ingredientsService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.ingredientsService.remove(id);
    return { code: 0, message: 'ok', data: null };
  }
}
