module.exports = (theFunc) => (req, res, next) => {
  Promise.resolve(theFunc(req, res, next)).catch((err) => {
    console.error(err); // Log the error
    next(err);
  });
};