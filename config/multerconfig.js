const multer = require("multer");
const path=require("path");
const crypto = require("crypto");

//disk storage : 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/upload')
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12,function(err,bytes){
            const filename = bytes.toString("hex")+ path.extname(file.originalname);
            cb(null, filename)
        })
    }
})

const upload = multer({ storage: storage })
module.exports = upload;