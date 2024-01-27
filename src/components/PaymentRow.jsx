const PaymentRow = ({date,salesperson,paymentMode,amountPaid, amountBalance }) => {
  return <tr className="flex w-[100%] justify-around">
    <td className="py-[13px] w-[15%] text-center">{date}</td>
    <td className="py-[13px] w-[15%] text-center">{salesperson}</td>
    <td className="py-[13px] w-[15%] text-center">{paymentMode}</td>
    <td className="py-[13px] w-[15%] text-center">{amountPaid}</td>
    <td className="py-[13px] w-[15%] text-center">{amountBalance}</td>
  </tr>;
};
export default PaymentRow;
