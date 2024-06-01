import { Context, SNSEvent } from "aws-lambda";

export async function handler(
  event: SNSEvent,
  context: Context
): Promise<void> {
  event.Records.forEach((record) => {
    console.log("Order Event on Payments Function: ", record.Sns.Message);
  });
}
