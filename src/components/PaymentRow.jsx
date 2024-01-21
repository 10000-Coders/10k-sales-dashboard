const PaymentRow = ({date,salesperson,paymentMode,amountPaid, amountBalance }) => {
  return <tr>
    <td>{date}</td>
    <td>{salesperson}</td>
    <td>{paymentMode}</td>
    <td>{amountPaid}</td>
    <td>{amountBalance}</td>
  </tr>;
};
export default PaymentRow;
