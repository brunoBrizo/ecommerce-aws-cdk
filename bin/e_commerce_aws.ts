#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ProductsAppStack } from "../lib/productsApp-stack";
import { ECommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayerStack } from "../lib/productsAppLayer-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: "204137686769", // process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1", // process.env.CDK_DEFAULT_REGION,
};

const tags = {
  cost: "ecommerce",
  team: "bruno-aws",
};

const productsAppLayerStack = new ProductsAppLayerStack(
  app,
  "ProductsAppLayer",
  {
    tags,
    env,
  }
);

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  tags,
  env,
});

productsAppStack.addDependency(productsAppLayerStack);

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  tags,
  env,
});

eCommerceApiStack.addDependency(productsAppStack);
