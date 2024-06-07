import { Callback, Context, PostConfirmationTriggerEvent } from "aws-lambda";

// Here the user is already registered
export async function handler(
  event: PostConfirmationTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  console.log("event", event);
  callback(null, event);
}
