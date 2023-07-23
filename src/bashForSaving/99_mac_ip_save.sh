arp -a | awk '\!/incomplete/{ print $2 "\t" $4 "\t" $6 "\t" $7 }' | sed 's/[()]//g' | sort > /usr/home/ftp1c/macs.log
