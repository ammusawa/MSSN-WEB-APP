const express = require('express');
const router = express.Router();
const layoutHook = require('../views/_layout_hook');
router.use(layoutHook);
router.get('/', (req, res) => res.render('index', { title: 'Home' }));
module.exports = router;
