import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as cwLogs from "aws-cdk-lib/aws-logs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
  ordersHandler: lambdaNodeJS.NodejsFunction;
  orderEventsFetchHandler: lambdaNodeJS.NodejsFunction;
}

export class ECommerceApiStack extends cdk.Stack {
  private productAuthorizer: apiGateway.CognitoUserPoolsAuthorizer;
  private productAdminAuthorizer: apiGateway.CognitoUserPoolsAuthorizer;
  private customerPool: cognito.UserPool;
  private adminPool: cognito.UserPool;

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

    this.createCognitoAuth();

    const adminUserPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["cognito-idp:AdminGetUser"],
      resources: [this.adminPool.userPoolArn],
    });

    const adminUserPolicy = new iam.Policy(this, "AdminUserPolicy", {
      statements: [adminUserPolicyStatement],
    });

    adminUserPolicy.attachToRole(<iam.Role>props.productsAdminHandler.role);

    this.createProductsService(props, api);
    this.createOrdersService(props, api);
  }

  private createCognitoAuth() {
    // Creating lambda triggers
    const postConfirmationHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "PostConfirmationFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        functionName: "PostConfirmationFunction",
        entry: "lambda/auth/postConfirmationFunction.ts",
        handler: "handler",
        memorySize: 512,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    const preAuthenticationHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "PreAuthenticationFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        functionName: "PreAuthenticationFunction",
        entry: "lambda/auth/preAuthenticationFunction.ts",
        handler: "handler",
        memorySize: 512,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    // Creating customer UserPool
    this.customerPool = new cognito.UserPool(this, "CustomerPool", {
      lambdaTriggers: {
        preAuthentication: preAuthenticationHandler,
        postConfirmation: postConfirmationHandler,
      },
      userPoolName: "CustomerPool",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
        phone: false,
      },
      userVerification: {
        emailSubject: "Verify your email for our ECommerce App!",
        emailBody:
          "Hello, thanks for signing up to our ECommerce App! Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      signInAliases: {
        username: false,
        email: true,
      },
      standardAttributes: {
        fullname: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // Creating admin UserPool
    this.adminPool = new cognito.UserPool(this, "AdminPool", {
      userPoolName: "AdminPool",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      userInvitation: {
        emailSubject: "Invite to join our ECommerce App!",
        emailBody:
          "Hello, you have been invited to join our ECommerce App! Your username is {username} and temporary password is {####}",
      },
      signInAliases: {
        username: false,
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    this.customerPool.addDomain("CustomerPoolDomain", {
      cognitoDomain: {
        domainPrefix: "bb7-customer-service",
      },
    });

    this.adminPool.addDomain("AdminPoolDomain", {
      cognitoDomain: {
        domainPrefix: "bb7-admin-service",
      },
    });

    const customerWebScope = new cognito.ResourceServerScope({
      scopeName: "web",
      scopeDescription: "Customer Web scope",
    });

    const customerMobileScope = new cognito.ResourceServerScope({
      scopeName: "mobile",
      scopeDescription: "Customer Mobile scope",
    });

    const adminWebScope = new cognito.ResourceServerScope({
      scopeName: "web",
      scopeDescription: "Admin Web scope",
    });

    const customerResourceServer = this.customerPool.addResourceServer(
      "CustomerResourceServer",
      {
        identifier: "customer",
        userPoolResourceServerName: "CustomerResourceServer",
        scopes: [customerWebScope, customerMobileScope],
      }
    );

    const adminResourceServer = this.adminPool.addResourceServer(
      "AdminResourceServer",
      {
        identifier: "admin",
        userPoolResourceServerName: "AdminResourceServer",
        scopes: [adminWebScope],
      }
    );

    this.customerPool.addClient("customer-web-client", {
      userPoolClientName: "customerWebClient",
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(
            customerResourceServer,
            customerWebScope
          ),
        ],
      },
    });

    this.customerPool.addClient("customer-mobile-client", {
      userPoolClientName: "customerMobileClient",
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.hours(2),
      refreshTokenValidity: cdk.Duration.days(30),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(
            customerResourceServer,
            customerMobileScope
          ),
        ],
      },
    });

    this.adminPool.addClient("admin-web-client", {
      userPoolClientName: "adminWebClient",
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(adminResourceServer, adminWebScope),
        ],
      },
    });

    this.productAuthorizer = new apiGateway.CognitoUserPoolsAuthorizer(
      this,
      "ProductAuthorizer",
      {
        authorizerName: "ProductAuthorizer",
        cognitoUserPools: [this.customerPool, this.adminPool],
      }
    );

    this.productAdminAuthorizer = new apiGateway.CognitoUserPoolsAuthorizer(
      this,
      "ProductAdminAuthorizer",
      {
        authorizerName: "ProductAdminAuthorizer",
        cognitoUserPools: [this.adminPool],
      }
    );
  }

  private createProductsService(
    props: ECommerceApiStackProps,
    api: apiGateway.RestApi
  ) {
    const productsFetchIntegration = new apiGateway.LambdaIntegration(
      props.productsFetchHandler
    );

    const productsFetchWebMobileIntegrationOptions = {
      authorizer: this.productAuthorizer,
      authorizationType: apiGateway.AuthorizationType.COGNITO,
      authorizationScopes: ["customer/web", "customer/mobile", "admin/web"],
    };

    const productsFetchWebOnlyIntegrationOptions = {
      authorizer: this.productAuthorizer,
      authorizationType: apiGateway.AuthorizationType.COGNITO,
      authorizationScopes: ["customer/web", "admin/web"],
    };

    // Creates /GET /products
    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      productsFetchIntegration,
      productsFetchWebMobileIntegrationOptions
    );

    // Creates /GET /products/{id}
    const productsIdResource = productsResource.addResource("{id}");
    productsIdResource.addMethod(
      "GET",
      productsFetchIntegration,
      productsFetchWebOnlyIntegrationOptions // Limit mobile access
    );

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
      authorizer: this.productAdminAuthorizer,
      authorizationScopes: ["admin/web"],
      authorizationType: apiGateway.AuthorizationType.COGNITO,
    });

    // Creates /PUT /products/{id}
    productsIdResource.addMethod("PUT", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel,
      },
      authorizer: this.productAdminAuthorizer,
      authorizationScopes: ["admin/web"],
      authorizationType: apiGateway.AuthorizationType.COGNITO,
    });

    // Creates /DELETE /products/{id}
    productsIdResource.addMethod("DELETE", productsAdminIntegration, {
      authorizer: this.productAdminAuthorizer,
      authorizationScopes: ["admin/web"],
      authorizationType: apiGateway.AuthorizationType.COGNITO,
    });
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

    // GET /orders/events?email={email}
    const orderEventsResource = ordersResource.addResource("events");

    const orderEventsFetchValidator = new apiGateway.RequestValidator(
      this,
      "OrderEventsFetchValidator",
      {
        restApi: api,
        requestValidatorName: "OrderEventsFetchValidator",
        validateRequestBody: false,
        validateRequestParameters: true,
      }
    );

    const orderEventsFunctionIntegration = new apiGateway.LambdaIntegration(
      props.orderEventsFetchHandler
    );

    orderEventsResource.addMethod("GET", orderEventsFunctionIntegration, {
      requestParameters: {
        "method.request.querystring.email": true,
        "method.request.querystring.eventType": false,
      },
      requestValidator: orderEventsFetchValidator,
    });
  }
}
