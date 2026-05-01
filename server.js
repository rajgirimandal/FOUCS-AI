const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const db = require("./database");
const { exec } = require("child_process");

const app = express();

app.use(express.json());
app.use(cors());

// Serve website files
app.use(express.static(__dirname));

const SECRET_KEY = "focusai_secret_key";


//   AUTHENTICATION MIDDLEWARE

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if(!authHeader) return res.sendStatus(401);
    
    const token = authHeader.split(' ')[1];
    if(!token) return res.sendStatus(401);
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if(err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}


//    LOGIN 

const users = [
    { school: "kv_sukna", password: "kv@sukna" },
    { school: "kv_ro", password: "kv@ro" },
    { school: "kv_salt_lake", password: "kv@salt@lake" },
    { school: "CBSE", password: "CBSE" },
    { school: "kv_RANINAGAR", password: "kv@3rd" }
];

app.post("/login", (req,res) => {
    const {userId, passkey} = req.body;
    const user = users.find(u => u.school === userId);
    
    if(!user || user.password !== passkey){
        return res.status(401).json({success:false});
    }
    
    const token = jwt.sign(
        {school:userId},
        SECRET_KEY,
        {expiresIn:"2h"}
    );
    
    res.json({ success:true, token });
});

//   ADD STUDENT

app.post("/addStudent", authenticateToken, (req,res) => {
    const {name,roll} = req.body;
    const school = req.user.school;
    
    db.run(
        "INSERT INTO students (school,name,roll) VALUES (?,?,?)",
        [school,name,roll],
        function(err){
            if(err){
                console.log(err);
                return res.json({success:false});
            }
            res.json({success:true});
        }
    );
});


//   GET STUDENTS

app.get("/students", authenticateToken, (req,res) => {
    const school = req.user.school;
    
    db.all(
        "SELECT * FROM students WHERE school=?",
        [school],
        (err,rows) => {
            if(err){
                console.log(err);
                return res.json([]);
            }
            res.json(rows);
        }
    );
});


//   ATTENDANCE MODE (FIXED)

app.get("/start-attendance", authenticateToken, (req, res) => {
    const school = req.user.school;
    console.log(`Starting Python Attendance Script for school: ${school}...`);

    // Run Python file and pass the school name as an argument
    exec(`python attendance.py ${school}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution Error: ${error.message}`);
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Python Output: ${stdout}`);
    });

  
    res.send("Attendance camera opened successfully!");
});


//   START SERVER



const PORT = 5000;
app.listen(PORT, () => {
    console.log(`FocusAI server running on port ${PORT}`);
});