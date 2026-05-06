const app = require('./src/app');

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Orquestador escuchando en puerto ${PORT}`);
});
