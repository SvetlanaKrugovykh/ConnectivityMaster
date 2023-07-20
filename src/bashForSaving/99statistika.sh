timestamp=$(date "+%Y-%m-%d %H")
echo $timestamp

pfctl -ss | awk '$7~/ESTABLISHED/ { print $4 "\t" $6 "\t" $7 }' | awk -F ':' '/\(192\.168\./  {print $1 "\t" $2 "\t" $3}' | awk ' {print "TIMESTAMP" "\t" $1 "\t" $3 "\t" $4}' | sed 's/[()]//g' | sed "s|TIMESTAMP|$timestamp|g"| sort  >> /usr/home/ftp1c/stat168.log

pfctl -ss | awk '$7~/ESTABLISHED/ { print $4 "\t" $6 "\t" $7 }' | awk -F ':' '/\(10\.10/  {print $1 "\t" $2 "\t" $3}' | awk ' {print "TIMESTAMP" "\t" $1 "\t" $3 "\t" $4}' | sed 's/[()]//g' | sed "s|TIMESTAMP|$timestamp|g"| sort  >> /usr/home/ftp1c/stat10.log 