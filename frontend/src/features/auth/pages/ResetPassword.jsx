// import { useState } from "react";
// import supabase from "../../../config/supabaseClient";

// export default function ResetPassword() {

//     const [password, setPassword] =
//         useState("");

//     const [confirmPassword,
//         setConfirmPassword] =
//         useState("");

//     const [message, setMessage] =
//         useState("");

//     const handleSubmit = async (e) => {

//         e.preventDefault();

//         if (
//             password !== confirmPassword
//         ) {
//             setMessage(
//                 "Passwords do not match"
//             );
//             return;
//         }

//         const { error } =
//             await supabase.auth.updateUser({

//                 password,

//             });

//         if (error) {

//             setMessage(error.message);

//         } else {

//             setMessage(
//                 "Password updated successfully"
//             );

//         }
//     };

//     return (

//         <div className="login-layout">

//             <div className="login-card">

//                 <h2>Reset Password</h2>

//                 <form onSubmit={handleSubmit}>

//                     <input
//                         type="password"
//                         placeholder="New Password"
//                         value={password}
//                         onChange={(e) =>
//                             setPassword(
//                                 e.target.value
//                             )
//                         }
//                     />

//                     <input
//                         type="password"
//                         placeholder="Confirm Password"
//                         value={confirmPassword}
//                         onChange={(e) =>
//                             setConfirmPassword(
//                                 e.target.value
//                             )
//                         }
//                     />

//                     <button type="submit">
//                         Update Password
//                     </button>

//                 </form>

//                 {message && (
//                     <p>{message}</p>
//                 )}

//             </div>

//         </div>
//     );
// }    


import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {

    const navigate = useNavigate();

    const { updatePassword } = useAuth();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (password !== confirm) {

            setMessage(
                "Passwords do not match"
            );

            return;
        }

        try {

            await updatePassword(password);

            alert(
                "Password updated successfully"
            );

            navigate("/login");

        } catch (err) {

            setMessage(err.message);

        }

    };

    return (

        <div className="login-layout">

            <div className="login-card">

                <h2>Reset Password</h2>

                <form onSubmit={handleSubmit}>

                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(
                                e.target.value
                            )
                        }
                        className="login-input"
                    />

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirm}
                        onChange={(e) =>
                            setConfirm(
                                e.target.value
                            )
                        }
                        className="login-input"
                    />

                    <button
                        type="submit"
                        className="login-submit-button"
                    >
                        Update Password
                    </button>

                </form>

                {
                    message &&
                    <p>{message}</p>
                }

            </div>

        </div>

    );
}