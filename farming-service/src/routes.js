const express = require('express');
const plotsRouter = require('./modules/plots/plots.routes');
const cropSeasonsRouter = require('./modules/crop-seasons/crop-seasons.routes');
const farmingLogsRouter = require('./modules/farming-logs/farming-logs.routes');
const costsRouter = require('./modules/costs/costs.routes');

const router = express.Router();

router.use('/plots', plotsRouter);
router.use('/crop-seasons', cropSeasonsRouter);
router.use('/logs', farmingLogsRouter);
router.use('/costs', costsRouter);

module.exports = router;
