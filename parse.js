const fs = require('fs');
const mysql = require('mysql');

const db_info = {
  host:     'HOST',
  user:     'USER',
  password: 'PASSWORD',
  database: 'DB',
};

function mysqlQuery(conn, query) {
  return new Promise((resolve, reject) => {
    conn.query(query, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

(async () => {
  try {
    const operators = JSON.parse(fs.readFileSync('./node_modules/mcc-mnc-list/mcc-mnc-list.json'));
    const fields = [
      'type', 'countryName', 'countryCode',
      'mcc', 'mnc', 'brand', 'operator',
      'status', 'bands', 'notes'
    ];
    const maxLength = {};

    const queries = [];
    for (const op of operators) {
      let query = 'INSERT INTO `gsm_mcc_mnc` ';
      query += '(`id`,`' + fields.join('`,`') + '`) VALUES (NULL,';
      for (const field of fields) {
        if (op[field] === null) {
          query += `NULL,`;
        } else {
          const value = op[field].replace(/"/g, "'");
          query += `"${value}",`;

          if (!maxLength[field] || value.length > maxLength[field].length) {
            maxLength[field] = {};
            maxLength[field].length = value.length;
            maxLength[field].value = value;
          }
        }
      }
      query = query.slice(0, -1) + ');';
      queries.push(query);
    }
    console.log(maxLength);

    fs.writeFileSync('mcc_mnc.sql', queries.join('\n'));

    const conn = mysql.createConnection(db_info);
    conn.connect();

    await mysqlQuery(conn, 'TRUNCATE TABLE gsm_mcc_mnc;');

    const totalQueries = queries.length;
    for (const [i, query] of queries.entries()) {
      try {
        await mysqlQuery(conn, query);
        console.log(`${i+1} / ${totalQueries}`);
      } catch (err) {
        console.log(err.message);
        console.log(query);
      }
    }

    conn.end();
  } catch (err) {
    console.error(err.message);
  }
})();
