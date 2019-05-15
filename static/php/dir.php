var files = <?php 

$out = array();

$dir= realpath("../../data/unlabeled");

foreach (scandir($dir) as $filename) {
    $p = pathinfo($filename);
    $out[] = $p['filename'];
}


echo json_encode($out); ?>;


