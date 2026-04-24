fetch('http://localhost:3000/api/relatorios?tipo=mensal&ano=2026&mes=4', { headers: { 'cookie': 'next-auth.session-token=something' } })
  .then(res => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then(text => console.log("Response:", text.substring(0, 500)))
  .catch(err => console.error("Error:", err));
