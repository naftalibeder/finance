import db from "../db";

export const home = (): string => {
  const accounts = db.getAccounts();
  const transactions = db.getTransactions();

  let accountsHtml = "";
  accountsHtml += "<table>";
  accounts.forEach((a) => {
    accountsHtml += `
    <tr>
      <td>${a.id}</td>
      <td>${a.price.amount}</td>
      <td>${a.price.currency}</td>
    </tr>
    `;
  });
  accountsHtml += "</table>";

  let transactionsHtml = "";
  transactionsHtml += "<table>";
  transactions.forEach((t) => {
    transactionsHtml += `
    <tr>
      <td>${t.accountId}</td>
      <td>${t.date}</td>
      <td>${t.payee}</td>
      <td>${t.price.amount}</td>
      <td>${t.price.currency}</td>
    </tr>
    `;
  });
  transactionsHtml += "</table>";

  let html = `
  <script>
    const onClickRefresh = () => fetch('/extract', { method: 'POST' });
  </script>
  
  <button onclick="onClickRefresh()">Refresh</button>
  <p>${accounts.length} accounts</p>
  ${accountsHtml}
  <p>${transactions.length} transactions</p>
  ${transactionsHtml}
  `;

  return html;
};
