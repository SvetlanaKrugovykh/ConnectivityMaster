timestamp=$(date "+%Y-%m-%d %H")
echo $timestamp

cat /usr/home/ftp1c/stat10.log | sort | uniq -c > /usr/home/ftp1c/stat10_4hour.log
cat /usr/home/ftp1c/stat168.log | sort | uniq -c > /usr/home/ftp1c/stat168_4hour.log

rm /usr/home/ftp1c/stat10.log
rm /usr/home/ftp1c/stat168.log