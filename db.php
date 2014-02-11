
<?php
class DatabaseWrapper {
  private $dbh;
  
  public function __construct( $dbh) {
    $this->dbh = $dbh;
  }

  public function getOne( $sql ) {
    $sth = $this->dbh->prepare($sql);
    $sth->execute();
    return $sth->fetchObject(PDO::FETCH_ASSOC);
  }

  public function getAll( $sql ) {
    $sth = $this->dbh->prepare($sql);
    $sth->execute();
    return $sth->fetchAll(PDO::FETCH_ASSOC);
  }

  public function execute( $sql ) {
    $sth = $this->dbh->prepare($sql);
    $sth->execute();
  }

  public function insert( $sql ) {
    $sth = $this->dbh->prepare($sql);
    $sth->execute();
	return $this->dbh->lastInsertId();
  }
}
?>
