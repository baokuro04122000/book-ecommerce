import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Query,
  ValidationPipe,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Delete,
  Param,
  Put,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrderService } from '../service/order.service';
import { get } from 'http';

@Controller('api/v1')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/order/add')
  async add(@Body() order: any, @Res() res, @Req() req) {
    try {
      const payload = await this.orderService.addOrder(
        req.user.userId,
        order.order,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/address/add')
  async addDeliveryInfo(@Body() address: any, @Res() res, @Req() req) {
    try {
      const payload = await this.orderService.addDeliveryInfo(
        req.user.userId,
        address.address,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/address/get')
  async getDeliveryInfo(@Body() address: any, @Res() res, @Req() req) {
    try {
      const payload = await this.orderService.getDeliveryInfoById(
        req.user.userId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/address/:addressId/delete')
  async deleteDeliveryInfo(
    @Param('addressId') addressId: string,
    @Res() res,
    @Req() req,
  ) {
    try {
      const payload = await this.orderService.deleteDeliveryInfoByAddressId(
        req.user.userId,
        addressId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/address/:addressId/update')
  async updateDeliveryInfo(
    @Param('addressId') addressId: string,
    @Body() address: any,
    @Res() res,
    @Req() req,
  ) {
    try {
      const payload = await this.orderService.updateDeliveryInfo(
        req.user.userId,
        addressId,
        address.address,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('/address/:addressId/set-default')
  async setDefaultDeliveryInfo(
    @Param('addressId') addressId: string,
    @Res() res,
    @Req() req,
  ) {
    try {
      const payload = await this.orderService.setDefaultDeliveryInfo(
        req.user.userId,
        addressId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @Get('/pay/paypal-success')
  async paymentSuccess(@Res() res, @Req() req) {
    try {
      const payerId = req.query.PayerID;
      const paymentId = req.query.paymentId;
      const payload = await this.orderService.paypalPaymentSuccess(
        payerId,
        paymentId,
      );
      return res.redirect('http://localhost:3000/checkout/ordered');
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @Get('/pay/paypal-cancel')
  async paymentCancel(@Res() res, @Req() req) {
    try {
      const { token } = req.query;
      const payload = await this.orderService.paypalPaymentCancel(token);
      return res.redirect('http://localhost:3000/checkout/cancelled');
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/pay/check-status')
  async checkStatusPayment(@Res() res, @Req() req) {
    try {
      const { payId } = req.body;
      const payload = await this.orderService.paypalPaymentStatus(
        req.user.userId,
        payId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/seller/not-done')
  async getOrderNotDone(@Res() res, @Req() req) {
    try {
      const payload = await this.orderService.getOrdersNotDone(
        req.user.sellerId,
        req.query,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/order/seller/update-status')
  async sellerUpdateStatusOrder(@Res() res, @Req() req) {
    try {
      const { orderItemId } = req.body;
      const payload = await this.orderService.updateStatusOrderBySeller(
        req.user.sellerId,
        orderItemId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/order/seller/cancel')
  async cancelOrderBySeller(@Res() res, @Req() req) {
    try {
      const { orderItemId, reason } = req.body;
      const payload = await this.orderService.cancelOrderItemBySeller(
        req.user.sellerId,
        orderItemId,
        reason,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/:orderId/get')
  async getOrderByOrderId(
    @Res() res,
    @Req() req,
    @Param('orderId') orderId: string,
  ) {
    try {
      const payload = await this.orderService.getOrderById(
        req.user.userId,
        orderId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/all')
  async getAllOrders(@Res() res, @Req() req) {
    try {
      const payload = await this.orderService.getAllOrders(
        req.user.userId,
        req.query,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/all-packed')
  async getAllOrdersPackedByUser(@Res() res, @Req() req) {
    try {
      const { page, limit } = req.query;
      const payload = await this.orderService.getAllOrdersPackedByUser(
        req.user.userId,
        page,
        limit,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/all-ordered')
  async getAllOrdersOderedByUser(@Res() res, @Req() req) {
    try {
      const { page, limit } = req.query;
      const payload = await this.orderService.getAllOrderedByUser(
        req.user.userId,
        page,
        limit,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/all-cancelled')
  async getAllOrdersCancelledByUser(@Res() res, @Req() req) {
    try {
      const { page, limit } = req.query;
      const payload = await this.orderService.getAllOrdersCancelByUser(
        req.user.userId,
        page,
        limit,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/shipper/get-order')
  async getAllOrdersByShipper(@Res() res, @Req() req) {
    try {
      const { page, limit } = req.query;
      const payload = await this.orderService.getOrdersShipping(
        req.user.userId,
        page,
        limit,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/order/shipper/update-order')
  async updateStatusOrdersByShipper(@Res() res, @Req() req) {
    try {
      const { orderItemId } = req.body;
      const payload = await this.orderService.updateStatusOrderByShipper(
        req.user.userId,
        orderItemId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/order/shipper/cancel-order')
  async cancelOrdersByShipper(@Res() res, @Req() req) {
    try {
      const { orderItemId, reason } = req.body;
      const payload = await this.orderService.cancelOrderItemByShipper(
        req.user.userId,
        orderItemId,
        reason,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/order/shipper/reject-order')
  async cancelRejectOrdersByShipper(@Res() res, @Req() req) {
    try {
      const { orderItemId, reason } = req.body;
      const payload =
        await this.orderService.cancelOrderItemByShipperClientReject(
          req.user.userId,
          orderItemId,
          reason,
        );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/seller/done')
  async allOrderDoneSeller(@Res() res, @Req() req) {
    try {
      const { page, limit } = req.query;
      const payload = await this.orderService.getAllOrdersCompletedBySeller(
        req.user.sellerId,
        page,
        limit,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/order/all-done')
  async allOrderDoneUser(@Res() res, @Req() req) {
    try {
      const { page, limit } = req.query;
      const payload = await this.orderService.getAllOrdersCompletedByUser(
        req.user.userId,
        page,
        limit,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/product/user/review')
  async userReview(@Res() res, @Req() req) {
    try {
      const { productId, rating, comment } = req.body;
      const payload = await this.orderService.reviewProductByUser({
        userId: req.user.userId,
        productId: productId,
        rating: rating,
        comment: comment,
      });
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }
}
