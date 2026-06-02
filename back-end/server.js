// import express from "express";

// import cors from "cors";

// const app = express();

// app.use(cors());

// app.use(express.json());

// // app.get("/", (req, res) => {

// //     res.send("Backend Running");

// // });

// app.listen(

//     5000,

//     () => {

//         console.log(
//             "Server running at 5000"
//         )

//     }

// );

// app.post(
// "/api/login",

// async(req,res)=>{

// const {email,password}=req.body

// const {data,error}=

// await supabase.auth
// .signInWithPassword({

// email,
// password

// })

// if(error){

// return res
// .status(401)
// .json(error)

// }

// res.json(data)

// })

import express from "express";

import cors from "cors";

import supabase from "./config/supabaseClient.js"

const app = express();

app.use(cors());

app.use(express.json());

app.post(

    "/api/login",

    async (req, res) => {

        try {

            const {

                email,

                password

            }

                =

                req.body;

            const {

                data,

                error

            }

                =

                await supabase.auth
                    .signInWithPassword({

                        email,

                        password

                    });

            if (error) {

                return res
                    .status(401)
                    .json({

                        message:

                            error.message

                    });

            }

            res.json(data);

        }

        catch (err) {

            res
                .status(500)
                .json({

                    message:

                        err.message

                });

        }

    }

);

app.listen(

    5000,

    () => {

        console.log(

            "Server running at 5000"

        )

    }

);