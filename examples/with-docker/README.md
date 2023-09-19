# Example ERC20 token API

This example shows how to create a GraphQL API for an ERC20 token using Ponder and Docker. It uses the Adventure Gold
token contract, which emits `Transfer`, `Approval`, and `OwnershipTransferred` events.

## Prerequisites

- Docker

## Instructions

- Set environment variables in `.env.local` and `.env.production` based on the example in `.env.example`
- Run `npm run dev:up` to start the Ponder development server
- Run `npm run prod:up` to start the Ponder production server in detached mode

````bash


## Sample queries

### Get the current balance and all approvals for an account

```graphql
{
  account(id: "0x1337f7970E8399ccbc625647FCE58a9dADA5aA66") {
    balance
    approvals {
      spender
      amount
    }
  }
}
````

### Get the top 10 accounts by balance

```graphql
{
  accounts(first: 50, orderBy: "balance", orderDirection: "desc") {
    id
    balance
  }
}
```

### Get the current owner of the token contract

```graphql
{
  accounts(where: { isOwner: true }) {
    id
  }
}
```

### Get all transfer events for an account

```graphql
{
  account(id: "0x1337f7970E8399ccbc625647FCE58a9dADA5aA66") {
    transferEventsTo {
      from
      amount
    }
    transferEventsFrom {
      to
      amount
    }
  }
}
```