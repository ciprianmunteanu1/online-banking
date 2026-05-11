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

export type BeneficiaryTransferSuccessResponse = {
  transactionId: string;
  status: string;
  sourceAccountId: string;
  beneficiaryId: string;
  beneficiaryIban: string;
  amount: string;
  currency: string;
  internalBeneficiary: boolean;
  ledgerBalanced: true;
};

export type BeneficiaryTransferServiceResult = {
  httpStatus: number;
  body: BeneficiaryTransferSuccessResponse;
};

export type MerchantPaymentSuccessResponse = {
  transactionId: string;
  status: string;
  sourceAccountId: string;
  merchantId: string;
  amount: string;
  currency: string;
  ledgerBalanced: true;
};

export type MerchantPaymentServiceResult = {
  httpStatus: number;
  body: MerchantPaymentSuccessResponse;
};
