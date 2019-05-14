<!DOCTYPE html>
<html lang="en">
   <head>
   <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
      <!-- Latest compiled and minified JavaScript -->
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.0/js/bootstrap.min.js"></script>

      <style>
         div {
               height: 500px;
               width: 700px;
               

               position: fixed;
               top: 50%;
               left: 50%;
               margin-top: -250px;
               margin-left: -350px;
            }

         p.important{
            color: blue;
            font-size: 20px;
            align: center;
         
         }
         .btn {
            position: relative;
            margin-left: 37.5%;
            padding: 14px 10px;
            border: 0 none;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 5px;
            
            }
            
            .btn:focus, .btn:active:focus, .btn.active:focus {
                  outline: 0 none;
            }
            
            .btn-primary {
                  background: #0099cc;
                  color: #ffffff;
            }
            .btn-primary {
                     background: #0099cc;
                     color: #ffffff;
               }
               
               .btn-primary:hover, .btn-primary:focus, .btn-primary:active, .btn-primary.active, .open > .dropdown-toggle.btn-primary {
                     background: #33a6cc;
               }
               
               .btn-primary:active, .btn-primary.active {
                     background: #007299;
                     box-shadow: none;
               }
            p.important{
               font-size: 15;
            }
            
      </style>

   </head>
   <body>
      
   <div > 
   <?php
   
   if (count($_POST) && (strpos($_POST['img'], 'data:image/png;base64') === 0)) {
      
   $img = $_POST['img'];
   $img = str_replace('data:image/png;base64,', '', $img);
   $img = str_replace(' ', '+', $img);
   $data = base64_decode($img);

   $file = substr($_POST['filename'],11, strlen($_POST['filename']));
   $file_number = substr($file,0,strpos($file,"."));
   $file_extension = substr($file, strpos($file,"."), strlen($file));

   $file_label = "../../data/cut/".$file_number.'_cutting_label.png';
   $file_unlabeled_img = "../../data/uncut/".$file;
   $file_labeled_img = "../../data/cut/".$file;
      
   if (file_put_contents($file_label, $data)) {

      rename($file_unlabeled_img, $file_labeled_img);
      
      date_default_timezone_set('Europe/London');
      $date = date('Y/m/d H:i');
      //write in log:
      $fp = fopen('../../data/log_cutting.txt', 'a');
      fwrite($fp, $filename.".png\t".$_POST['editor']."\t\t".$date."\n" );
      fclose($fp);

      echo "<img src='../images/thank-you-meme-01.jpg'>";
   } 
   else {
      echo "<p class = 'important'>The canvas could not be saved, contact ORME if problem cotinues</p>";
      echo "<p class = 'important'>",$_POST['filename']," file number: ",$file_number, " extension: ",$file_extension,"</p>";
      echo "<p class = 'important'>",$file_label,"</p>";
      echo "<p class = 'important'>", getcwd(),"</p>";
      
   } 
      
   }
   else{
      echo "<p class = 'important'>The canvas could not be saved, contact ORME if problem cotinues</p>";
   }                     
   ?>
   <button class="btn btn-primary text-center" onclick="clicked()"> Cut another! </button>
   </div>
   <script>
      function clicked(){
         window.location.replace("https://www.orme.com/_modules_/annotation_tool/cutting.html")
      }
   </script>

   </body>
</html>