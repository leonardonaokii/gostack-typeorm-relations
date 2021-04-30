import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found.');
    }

    const foundProducts = await this.productsRepository.findAllById(products);

    if (foundProducts.length !== products.length) {
      throw new AppError('One or more products inserted was not found');
    }

    const hashedProducts = products.reduce(
      (prev, curr) => prev.set(curr.id, curr.quantity),
      new Map(),
    );

    const formattedProducts = foundProducts.map(product => {
      if (product.quantity < hashedProducts.get(product.id)) {
        throw new AppError('Not enough quantity');
      }
      return {
        product_id: product.id,
        price: product.price,
        quantity: hashedProducts.get(product.id),
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: formattedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
