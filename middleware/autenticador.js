const express = require('express')
const router = express.Router()

router.use('/admin/', (req, res, next) => {
    if (req.session.usuario == undefined){
        req.flash('mensaje', 'No ha iniciado sesión')
        res.redirect('/inicio')
    }else{
        next()
    }
})

module.exports = router