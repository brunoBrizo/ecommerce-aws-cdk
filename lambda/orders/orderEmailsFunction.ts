import { Context, SQSEvent } from "aws-lambda";
import * as AwsXRay from "aws-xray-sdk";

AwsXRay.captureAWS(require("aws-sdk"));

export async function handler(event: SQSEvent, context: Context) {
  event.Records.forEach((record) => {
    console.log(JSON.stringify(record.body));
  });
}
