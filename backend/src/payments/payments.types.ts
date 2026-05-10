export type TransferSuccessResponse = {
  transactionId: string;
  status: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  currency: string;
  ledgerBalanced: true;
};

export type TransferServiceResult = {
  httpStatus: number;
  body: TransferSuccessResponse;
};
