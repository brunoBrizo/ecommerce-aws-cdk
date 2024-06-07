#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ProductsAppStack } from "../lib/productsApp-stack";
import { ECommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayerStack } from "../lib/productsAppLayer-stack";
import { EventsDdbStack } from "../lib/eventsDdb-stack";
import { OrdersAppLayersSatck } from "../lib/ordersAppLayers-stack";
import { OrdersAppStack } from "../lib/ordersApp-stack";
import { AuthLayersStack } from "../lib/authLayers-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: "204137686769", // process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1", // process.env.CDK_DEFAULT_REGION,
};

const tags = {
  cost: "ecommerce",
  team: "bruno-aws",
};

const authLayersStack = new AuthLayersStack(app, "AuthLayers", {
  tags,
  env,
});

const productsAppLayerStack = new ProductsAppLayerStack(
  app,
  "ProductsAppLayer",
  {
    tags,
    env,
  }
);

const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", {
  tags,
  env,
});

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  tags,
  env,
  eventsDdb: eventsDdbStack.eventsTable,
});

productsAppStack.addDependency(productsAppLayerStack);
productsAppStack.addDependency(eventsDdbStack);
productsAppStack.addDependency(authLayersStack);

const ordersAppLayerStack = new OrdersAppLayersSatck(app, "OrdersAppLayer", {
  tags,
  env,
});

const ordersAppStack = new OrdersAppStack(app, "OrdersApp", {
  tags,
  env,
  productsTable: productsAppStack.productsTable,
  eventsTable: eventsDdbStack.eventsTable,
});

ordersAppStack.addDependency(productsAppStack);
ordersAppStack.addDependency(ordersAppLayerStack);
ordersAppStack.addDependency(eventsDdbStack);

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: ordersAppStack.ordersHandler,
  orderEventsFetchHandler: ordersAppStack.orderEventsFetchHandler,
  tags,
  env,
});

eCommerceApiStack.addDependency(productsAppStack);
eCommerceApiStack.addDependency(ordersAppStack);
