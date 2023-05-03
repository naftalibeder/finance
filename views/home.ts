import db from "../db";

export const home = (): string => {
  const transactions = db.getTransactions();

  let tableHtml = "";
  tableHtml += "<table>";
  transactions.forEach((t) => {
    tableHtml += `
    <tr>
      <td>${t.account}</td>
      <td>${t.date}</td>
      <td>${t.payee}</td>
      <td>${t.price.amount}</td>
    </tr>
    `;
  });
  tableHtml += "</table>";

  let html = `
  <script>
    const onClickRefresh = () => fetch('/extract', { method: 'POST' });
  </script>
  
  <button onclick="onClickRefresh()">Refresh</button>

  <p>${transactions.length} transactions</p>

  ${tableHtml}
  `;

  return html;
};
