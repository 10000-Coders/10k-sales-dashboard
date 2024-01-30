import PaymentRow from "./PaymentRow";

const PayementDetailsStudent = () => {
  return (
    <table className="shadow-[0_4px_4px_0px_rgba(0,0,0,0.25)] rounded-[16px] overflow-hidden w-[100%]">
      <thead className="bg-black justify-around flex w-[100%] text-white">
        <th className="py-[13px] w-[15%]">Date</th>
        <th className="py-[13px] w-[15%]">Sales Executive</th>
        <th className="py-[13px] w-[15%]">Mode Of Payment</th>
        <th className="py-[13px] w-[15%]">Amount Received</th>
        <th className="py-[13px] w-[15%]">Amount Remaining</th>
      </thead>
      <tbody>
        <PaymentRow date="12/2/23" salesperson="Rakesh" paymentMode="Oniline" amountPaid="2000" amountBalance="28"/>
      </tbody>
    </table>
  );
};
export default PayementDetailsStudent;
