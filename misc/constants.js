const ERRORS = {
  USER_ALREADY_EXISTS: "User Already exists with the given username and email",
  INVALID_PASSWORD_LENGTH:
    "Invalid Password - password should be greater or equal to 6 characters and less then equal to 12 characters",
  INVALID_PHONE: "Invalid Phone",
  NOT_MATCHED_PWD_CONFIRM_PWD: "Password and Confirm Password not matched",
  INVALID_DATE: "Invalid Date should be formatted like this DD/MM/YYYY",
  GENERIC_ERROR:
    "Due to some technical reason create process not complete. Please try again later or contact app administrator",
  INVALID_LOGIN: "Invalid username or password!",
};

const JWT_SECRET = "your_jwt_secret_key";

// Post:Like|Unlike, Comments:Added|Removed|Updated|Like|Unlike, FriendRequest:Sent|Approved|Rejected
const NOTIFICATION_TYPES = [
  "post:liked",
  "post:unliked",
  "comment:added",
  "comment:removed",
  "comment:updated",
  "comment:liked",
  "comment:unliked",
  "frequest:sent",
  "frequest:approved",
  "frequest:rejected",
];

const VERIFIED2FA_STATUS = {
  PENDING: 0,
  INPROGRESS: 1,
  COMPLETED: 2,
};

module.exports = { ERRORS, JWT_SECRET, NOTIFICATION_TYPES, VERIFIED2FA_STATUS };
