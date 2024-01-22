const PaymentRow = ({date,salesperson,paymentMode,amountPaid, amountBalance }) => {
  return <tr className="flex w-[100%] justify-around">
    <td className="py-[13px]">{date}</td>
    <td className="py-[13px]">{salesperson}</td>
    <td className="py-[13px]">{paymentMode}</td>
    <td className="py-[13px]">{amountPaid}</td>
    <td className="py-[13px]">{amountBalance}</td>
  </tr>;
};
export default PaymentRow;
