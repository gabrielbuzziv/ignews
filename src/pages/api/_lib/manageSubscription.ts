import { query as Query } from "faunadb";
import { fauna } from "../../../services/fauna";
import { stripe } from "../../../services/stripe";

export async function saveSubscription(
  subscriptionId: string,
  customerId: string,
  createAction = false
) {
  const userRef = await fauna.query(
    Query.Select(
      'ref',
      Query.Get(
        Query.Match(
          Query.Index('user_by_customer_stripe_id'),
          customerId
        )
      )
    )
  )

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const subscriptionData = {
    id: subscription.id,
    userId: userRef,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
  }

  if (createAction) {
    await fauna.query(
      Query.Create(
        Query.Collection('subscriptions'),
        { data: subscriptionData }
      )
    )
  } else {
    await fauna.query(
      Query.Replace(
        Query.Select(
          'ref',
          Query.Get(
            Query.Match(
              Query.Index('subscription_by_id'),
              subscription.id
            )
          )
        ),
        { data: subscriptionData }
      )
    )
  }

}