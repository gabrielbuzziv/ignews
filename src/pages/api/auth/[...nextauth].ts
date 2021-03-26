import { query as Query } from 'faunadb';

import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'

import { fauna } from '../../../services/fauna';

export default NextAuth({
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scope: 'read:user'
    }),
  ],
  callbacks: {
    async session(session) {
      try {
        const userActiveSubscription = await fauna.query(
          Query.Get(
            Query.Intersection([
              Query.Match(
                Query.Index('subscription_by_user_ref'),
                Query.Select(
                  'ref',
                  Query.Get(
                    Query.Match(
                      Query.Index('user_by_email'),
                      Query.Casefold(session.user.email)
                    )
                  )
                )
              ),
              Query.Match(
                Query.Index('subscription_by_status'),
                'active'
              )
            ])
          )
        )
  
        return {
          ...session,
          activeSubscription: userActiveSubscription
        }
      } catch {
        return {
          ...session,
          activeSubscription: null
        }
      }
    },
    async signIn(user, account, profile) {

      try {
        await fauna.query(
          Query.If(
            Query.Not(
              Query.Exists(
                Query.Match(
                  Query.Index('user_by_email'),
                  Query.Casefold(user.email)
                )
              )
            ),
            Query.Create(
              Query.Collection('users'),
              { data: { email: user.email } }
            ),
            Query.Get(
              Query.Match(
                Query.Index('user_by_email'),
                Query.Casefold(user.email)
              )
            )
          )
        )

        return true
      } catch { 
        return false
      }
    },
  }
})