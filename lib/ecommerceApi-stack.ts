import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as cwLogs from "aws-cdk-lib/aws-logs";

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
  ordersHandler: lambdaNodeJS.NodejsFunction;
}

export class ECommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwLogs.LogGroup(this, "ECommerceApiLogs");
    const api = new apiGateway.RestApi(this, "ECommerceApi", {
      restApiName: "ECommerceApi",
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apiGateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apiGateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          caller: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
    });

    this.createProductsService(props, api);
    this.createOrdersService(props, api);
  }

  private createProductsService(
    props: ECommerceApiStackProps,
    api: apiGateway.RestApi
  ) {
    const productsFetchIntegration = new apiGateway.LambdaIntegration(
      props.productsFetchHandler
    );

    // Creates /GET /products
    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", productsFetchIntegration);

    // Creates /GET /products/{id}
    const productsIdResource = productsResource.addResource("{id}");
    productsIdResource.addMethod("GET", productsFetchIntegration);

    const productsAdminIntegration = new apiGateway.LambdaIntegration(
      props.productsAdminHandler
    );

    // Creates /POST /products
    const productRequestValidator = new apiGateway.RequestValidator(
      this,
      "ProductRequestValidator",
      {
        restApi: api,
        requestValidatorName: "ProductRequestValidator",
        validateRequestBody: true,
      }
    );

    const productModel = new apiGateway.Model(this, "ProductModel", {
      restApi: api,
      modelName: "ProductModel",
      schema: {
        type: apiGateway.JsonSchemaType.OBJECT,
        properties: {
          productName: {
            type: apiGateway.JsonSchemaType.STRING,
          },
          code: {
            type: apiGateway.JsonSchemaType.STRING,
          },
          price: {
            type: apiGateway.JsonSchemaType.NUMBER,
          },
          model: {
            type: apiGateway.JsonSchemaType.STRING,
          },
          productUrl: {
            type: apiGateway.JsonSchemaType.STRING,
          },
        },
        required: ["productName", "code", "price", "model"],
      },
    });

    productsResource.addMethod("POST", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel,
      },
    });

    // Creates /PUT /products/{id}
    productsIdResource.addMethod("PUT", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel,
      },
    });

    // Creates /DELETE /products/{id}
    productsIdResource.addMethod("DELETE", productsAdminIntegration);
  }

  private createOrdersService(
    props: ECommerceApiStackProps,
    api: apiGateway.RestApi
  ) {
    const ordersIntegration = new apiGateway.LambdaIntegration(
      props.ordersHandler
    );

    // GET /orders
    // GET /orders?email={email}
    // GET /orders?email={email}&orderId={orderId}
    const ordersResource = api.root.addResource("orders");
    ordersResource.addMethod("GET", ordersIntegration);

    // POST /orders
    const orderRequestValidator = new apiGateway.RequestValidator(
      this,
      "OrderRequestValidator",
      {
        restApi: api,
        requestValidatorName: "OrderRequestValidator",
        validateRequestBody: true,
      }
    );

    const orderModel = new apiGateway.Model(this, "OrderModel", {
      modelName: "OrderModel",
      restApi: api,
      schema: {
        type: apiGateway.JsonSchemaType.OBJECT,
        properties: {
          email: {
            type: apiGateway.JsonSchemaType.STRING,
          },
          productIds: {
            type: apiGateway.JsonSchemaType.ARRAY,
            minItems: 1,
            items: {
              type: apiGateway.JsonSchemaType.STRING,
            },
          },
          payment: {
            type: apiGateway.JsonSchemaType.STRING,
            enum: ["CASH", "CREDIT_CARD", "DEBIT_CARD"],
          },
        },
        required: ["email", "productIds", "payment"],
      },
    });

    ordersResource.addMethod("POST", ordersIntegration, {
      requestValidator: orderRequestValidator,
      requestModels: {
        "application/json": orderModel,
      },
    });

    const orderDeleteValidator = new apiGateway.RequestValidator(
      this,
      "OrderDeleteValidator",
      {
        restApi: api,
        requestValidatorName: "OrderDeleteValidator",
        validateRequestBody: false,
        validateRequestParameters: true,
      }
    );

    // DELETE /orders?email={email}&orderId={orderId}
    ordersResource.addMethod("DELETE", ordersIntegration, {
      requestParameters: {
        "method.request.querystring.email": true,
        "method.request.querystring.orderId": true,
      },
      requestValidator: orderDeleteValidator,
    });
  }
}
