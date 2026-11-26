# DOPI TOWNE Security Specification

## 1. Data Invariants
1. **Owner & PII Isolation**: `users/{uid}` contains player `email` and private balances. Only the document owner (`request.auth.uid == uid`) or the verified Admin (`email == nhgb2605@gmail.com && email_verified == true`) can read `users/{uid}`. Non-PII farm visits use `public_farms/{uid}`.
2. **Verified Admin Only**: Admin privileges require `request.auth.token.email == 'nhgb2605@gmail.com' && request.auth.token.email_verified == true`. Unverified emails cannot impersonate Admin.
3. **Immutable Ownership & Timestamps**: `uid`, `createdAt`, `sellerUid`, `fromUid`, `toUid`, and `code` are immutable after document creation.
4. **Redeem Code Integrity**: Only Admin can create, delete, list, or toggle `redeem_codes/{code}`. Players can only `get` a specific code and atomically increment `usedCount` by 1 while appending their own `uid` to `usedBy` when `isActive == true`, `usedCount < maxUses`, and not already in `usedBy`.
5. **P2P Market Terminal Lock**: Once `market_listings/{listingId}` reaches `status: 'sold'` or `'cancelled'`, non-admin users can never mutate it again. Sellers cannot buy their own listings; buyers cannot cancel someone else's listing.
6. **Market Payout Monotonicity**: A buyer settling a P2P purchase in a transaction may only increase the seller's `gold` or `dopiCoins` on `users/{sellerUid}` (strictly greater than previous balance, never negative or zero, and no other gameplay keys touched).
7. **Friend Request Scope**: Only `fromUid` or `toUid` (or Admin) can read/list a `friend_requests/{reqId}` document. Only `toUid` can accept/reject a pending request, and terminal states (`accepted`/`rejected`) are locked.
8. **Bounded Arrays & Strings**: All IDs match `^[a-zA-Z0-9_\-]+$`, all strings enforce `.size()` bounds, `farmPlots.size() <= 30`, `friends.size() <= 100`, `usedBy.size() <= 500`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Cross-user PII Read**: User B attempts `get` on `users/userA`.
2. **Users Collection Scrape**: Non-admin attempts `list` on `users`.
3. **Shadow Field Injection on User**: User A attempts to update `users/userA` with an unknown ghost field `{ isAdmin: true }`.
4. **Email Spoofing Admin**: User with `email: 'nhgb2605@gmail.com'` and `email_verified: false` attempts to create `redeem_codes/HACK-9999`.
5. **Redeem Code List Scrape**: Non-admin attempts `list` on `redeem_codes`.
6. **Redeem Code Amount Tampering**: Non-admin updates `redeem_codes/DOPI-1234` trying to change `amount` or `maxUses`.
7. **Redeem Code Double-Use**: User already in `usedBy` attempts to update `redeem_codes/DOPI-1234` again.
8. **Market Self-Buy / Spoof Seller**: User A creates a listing with `sellerUid: 'userB'`, or buys their own listing.
9. **Market Terminal State Reopen**: Buyer or seller attempts to update a `status: 'sold'` listing back to `'active'`.
10. **Market Negative Seller Drain**: User B attempts to update `users/userA` decreasing `gold` from `500` to `10`.
11. **Friend Request Forgery**: User A creates `friend_requests/req1` with `fromUid: 'userC'` or accepts a request addressed to `userB`.
12. **Resource Poisoning / Invalid ID**: User attempts to write a 200-character document ID or `businessName` exceeding 40 characters.
