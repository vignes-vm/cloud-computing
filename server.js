const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req,res)=>{
    res.send("Backend Running");
});

app.post("/submit",(req,res)=>{

    console.log(req.body);

    res.json({
        success:true
    });

});

const PORT=process.env.PORT||3000;

app.listen(PORT,()=>{
    console.log("Server Started");
});