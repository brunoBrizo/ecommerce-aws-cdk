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
    productsResource.addMethod("POST", productsAdminIntegration);

    // Creates /PUT /products/{id}
    productsIdResource.addMethod("PUT", productsAdminIntegration);

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
    ordersResource.addMethod("POST", ordersIntegration);

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
