import db from "../db";

export const home = (): string => {
  const transactions = db.getTransactions();

  let html = "";

  html += "<button>Extract</button>";

  html += `<p>${transactions.length} transactions</p>`;
  html += "<table>";
  transactions.forEach((t) => {
    html += `
    <tr>
      <td>${t.account}</td>
      <td>${t.date}</td>
      <td>${t.payee}</td>
      <td>${t.price.amount}</td>
    </tr>
    `;
  });
  html += "</table>";

  return html;
};
