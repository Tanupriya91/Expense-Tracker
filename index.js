const express = require ("express");

const {db} = require("./config/firebase"); 

const app = express();

app.use(express.json());

app.get("/", (req,res) => {
     res.send("Expense Tracker API");
});

app.get("/test", async (req,res) => {
    try{
        const collection = await db.listCollections();

        res.status(200).json({
            success:true,
            collection: collection.map((c)=>c.id),
        });

    }
    catch(error){
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
app.listen(3000, ()=>{
    console.log("Server is running on port 3000");
});