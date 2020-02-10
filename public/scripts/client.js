$(document).ready(function() {

  $(".link-row").hover(
    function() {
      console.log("hovering!");
    },
    function() {
      console.log("stopped hovering!");
    }
  );

});