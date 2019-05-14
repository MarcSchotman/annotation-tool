var files = <?php 

$out = array();

$dir= realpath("../../data/uncut");
foreach (scandir($dir) as $filename) {
    $p = pathinfo($filename);
    $out[] = $p['filename'];
}


echo json_encode($out); ?>;

var directory = <?php
$dir= realpath("../../data/uncut");
echo json_encode($dir); ?>;


