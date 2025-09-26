// server/src/routes/gas.routes.js
const express = require("express");
const ctrl = require("../controllers/gas.controller");

const router = express.Router();

/**
 * GET   /api/gas           -> trả danh sách 6 khí theo đúng thứ tự (status: 0|1)
 * PUT   /api/gas/bulk      -> cập nhật hàng loạt { items: [{ code, status(0|1) }, ...] }
 * GET   /api/gas/:code     -> lấy 1 khí (O2|N2O|MA4|MA7|VA|CO2)
 * PATCH /api/gas/:code     -> cập nhật 1 khí  { status: 0|1 }
 */

// list all (ordered)
router.get("/", ctrl.list);

// bulk update (đặt trước :code để tránh xung đột)
router.put("/bulk", ctrl.bulk);

// get one by code
router.get("/:code", ctrl.getOne);

// update one by code
router.patch("/:code", ctrl.setStatus);

module.exports = router;
