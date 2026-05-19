const app = require('./src/app');

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Orquestador escuchando en puerto ${PORT}`);
});
