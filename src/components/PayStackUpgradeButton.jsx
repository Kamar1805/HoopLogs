import React from "react";
import { PaystackButton } from "react-paystack";

/*
  Usage:
  <PaystackUpgradeButton
    email={user?.email}
    amountKobo={500000}          // amount in kobo (₦5,000 here)
    publicKey={import.meta.env.VITE_PAYSTACK_PUBLIC_KEY} // pass explicitly
    onSuccess={(ref)=>{ ... }}
  />
  Vite:  add to .env.development   VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx
  CRA:   REACT_APP_PAYSTACK_PUBLIC_KEY=pk_test_xxx  (then pass process.env value)
*/

const PaystackUpgradeButton = ({
  email = "guest@example.com",
  amountKobo,
  onSuccess,
  publicKey
}) => {
  // Resolve key (prop > Vite env > CRA env). Guard references to process/import.meta.
  let pk = publicKey;
  if (!pk && typeof import.meta !== "undefined" && import.meta.env) {
    pk = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  }
  if (!pk && typeof process !== "undefined" && process.env) {
    pk = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;
  }

  if (!pk) {
    console.warn("Paystack public key missing.");
  }

  const componentProps = {
    email,
    amount: amountKobo,
    publicKey: pk,
    text: "Upgrade Now",
    metadata: { feature: "premium_upgrade" },
    onSuccess: (ref) => onSuccess?.(ref),
    onClose: () => {}
  };

  return <PaystackButton className="wt-btn primary" {...componentProps} />;
};

export default PaystackUpgradeButton;